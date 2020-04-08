import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Flex } from '@rebass/grid';
import { get } from 'lodash';

import Page from '../components/Page';
import { withUser } from '../components/UserProvider';
import EditCollective from '../components/edit-collective';
import ErrorPage from '../components/ErrorPage';
import MessageBox from '../components/MessageBox';

import { compose } from '../lib/utils';
import { addCollectiveToEditData } from '../lib/graphql/queries';
import { addEditCollectiveMutation } from '../lib/graphql/mutations';
import { GraphQLContext } from '../lib/graphql/context';

import Loading from '../components/Loading';

class EditCollectivePage extends React.Component {
  static getInitialProps({ query, res }) {
    if (res) {
      res.set('Cache-Control', 'no-cache');
    }

    const scripts = { googleMaps: true }; // Used in <InputTypeLocation>
    return { slug: query && query.slug, query, ssr: false, scripts };
  }

  static propTypes = {
    slug: PropTypes.string, // for addCollectiveToEditData
    ssr: PropTypes.bool,
    data: PropTypes.object, // from withData
    LoggedInUser: PropTypes.object, // from withLoggedInUser
    loadingLoggedInUser: PropTypes.bool, // from withLoggedInUser
    editCollective: PropTypes.func.isRequired, // from addEditCollectiveMutation
  };

  constructor(props) {
    super(props);
    this.state = { Collective: get(props, 'data.Collective'), loading: false };
  }

  async componentDidMount() {
    const collective = get(this.props, 'data.Collective');
    this.setState({ Collective: collective || this.state.Collective });
  }

  componentDidUpdate(oldProps) {
    // We store the component in state and update only if the next one is not
    // null because of a bug in Apollo where it strips the `Collective` from data
    // during re-hydratation.
    // See https://github.com/opencollective/opencollective/issues/1872
    const currentCollective = get(this.props, 'data.Collective');
    if (currentCollective && get(oldProps, 'data.Collective.id') !== currentCollective.id) {
      // const refetch = get(oldProps, 'data.Collective.id') ? true : false;
      // TODO: to implement and avoid double fetching. no-cache ?
      const refetch = false;
      this.setState({ Collective: currentCollective, loading: refetch }, () => {
        // Edge case: same component, different collective (moving from edit to another edit through the menu)
        // This will reload data and also should re-initialize Form and sub-components
        if (refetch) {
          return this.props.data.refetch().then(() => this.setState({ loading: false }));
        }
      });
    }
  }

  render() {
    const { data, editCollective, LoggedInUser, loadingLoggedInUser } = this.props;
    const collective = get(data, 'Collective') || this.state.Collective;

    if (this.state.loading || (data && data.loading) || loadingLoggedInUser) {
      return (
        <Page>
          <Flex justifyContent="center" py={6}>
            <Loading />
          </Flex>
        </Page>
      );
    } else if (data && data.error) {
      return <ErrorPage data={data} />;
    } else if (!LoggedInUser || !collective) {
      return (
        <Page>
          <Flex justifyContent="center" p={5}>
            <MessageBox type="error" withIcon>
              {LoggedInUser ? (
                <FormattedMessage id="editCollective.notFound" defaultMessage="No collective data to edit" />
              ) : (
                <FormattedMessage id="mustBeLoggedIn" defaultMessage="You must be logged in to see this page" />
              )}
            </MessageBox>
          </Flex>
        </Page>
      );
    }

    return (
      <div>
        <GraphQLContext.Provider value={data}>
          <EditCollective
            collective={collective}
            LoggedInUser={LoggedInUser}
            editCollective={editCollective}
            loggedInEditDataLoaded
          />
        </GraphQLContext.Provider>
      </div>
    );
  }
}

const addGraphQL = compose(
  component =>
    addCollectiveToEditData(component, {
      skip: props => props.loadingLoggedInUser || !props.LoggedInUser,
    }),
  addEditCollectiveMutation,
);

export default withUser(addGraphQL(EditCollectivePage));
